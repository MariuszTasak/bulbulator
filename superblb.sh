SUPERBLB_DATE=`date`
for f in $*
do
	echo "processing: $f"
	. $f && ./bulbulator.sh
done
echo "You started superbulbulating exactly at "
echo $SUPERBLB_DATE
echo "now it's "
date
